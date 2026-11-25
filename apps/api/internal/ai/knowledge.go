package ai

import (
	"bufio"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"unicode"
)

// Chunk is one article excerpt from knowledge/*.md.
type Chunk struct {
	Ref   string // "ст. 70 ТК РФ"
	Code  string // "ТК РФ"
	Num   string // "70"
	Title string
	Text  string
	stems map[string]bool
}

// Knowledge is the in-memory norms index (small: plain keyword search).
type Knowledge struct {
	Chunks []Chunk
	byRef  map[string]*Chunk
	df     map[string]int
}

var headRe = regexp.MustCompile(`^##\s*(ТК|ГК)\s*РФ,\s*ст\.\s*([0-9.]+?)\.\s*(.+)$`)

// LoadKnowledge parses every markdown file in dir.
func LoadKnowledge(dir string) (*Knowledge, error) {
	files, err := filepath.Glob(filepath.Join(dir, "*.md"))
	if err != nil {
		return nil, err
	}
	k := &Knowledge{byRef: map[string]*Chunk{}, df: map[string]int{}}
	for _, f := range files {
		fh, err := os.Open(f)
		if err != nil {
			return nil, err
		}
		sc := bufio.NewScanner(fh)
		var cur *Chunk
		flush := func() {
			if cur != nil {
				cur.Text = strings.TrimSpace(cur.Text)
				k.Chunks = append(k.Chunks, *cur)
			}
		}
		for sc.Scan() {
			line := sc.Text()
			if m := headRe.FindStringSubmatch(line); m != nil {
				flush()
				code := m[1] + " РФ"
				cur = &Chunk{Ref: fmt.Sprintf("ст. %s %s", m[2], code), Code: code, Num: m[2], Title: strings.TrimSpace(m[3])}
				continue
			}
			if strings.HasPrefix(line, "#") {
				flush()
				cur = nil
				continue
			}
			if cur != nil {
				cur.Text += line + "\n"
			}
		}
		flush()
		_ = fh.Close()
	}
	for i := range k.Chunks {
		c := &k.Chunks[i]
		c.stems = stems(c.Title + " " + c.Title + " " + c.Text)
		for s := range c.stems {
			k.df[s]++
		}
		k.byRef[c.Ref] = c
	}
	return k, nil
}

var stop = map[string]bool{"котор": true, "такой": true, "може": true, "если": true, "что": true, "как": true, "для": true, "или": true, "это": true, "при": true, "его": true, "она": true, "они": true, "нужн": true, "можн": true, "ли": true}

// stems returns crude Russian stems (first 5 runes of words with 3+ runes).
func stems(s string) map[string]bool {
	out := map[string]bool{}
	for _, w := range strings.FieldsFunc(strings.ToLower(s), func(r rune) bool { return !unicode.IsLetter(r) && !unicode.IsDigit(r) }) {
		r := []rune(strings.ReplaceAll(w, "ё", "е"))
		if len(r) < 3 {
			continue
		}
		if len(r) > 5 {
			r = r[:5]
		}
		if st := string(r); !stop[st] {
			out[st] = true
		}
	}
	return out
}

// Search returns up to k chunks ranked by idf-weighted stem overlap.
func (k *Knowledge) Search(q string, n int) []Chunk {
	qs := stems(q)
	type scored struct {
		c Chunk
		s float64
	}
	var res []scored
	total := float64(len(k.Chunks))
	for _, c := range k.Chunks {
		var s float64
		for st := range qs {
			if c.stems[st] {
				s += math.Log(1 + total/float64(k.df[st]))
			}
			if strings.Contains(strings.ToLower(c.Title), st) {
				s += 1.5
			}
		}
		if s > 0 {
			res = append(res, scored{c, s})
		}
	}
	sort.SliceStable(res, func(i, j int) bool { return res[i].s > res[j].s })
	out := make([]Chunk, 0, n)
	for i := 0; i < len(res) && i < n; i++ {
		out = append(out, res[i].c)
	}
	return out
}

// Citation is an article reference found in model output.
type Citation struct {
	Ref      string `json:"ref"`
	Title    string `json:"title"`
	Verified bool   `json:"verified"`
}

var citeRe = regexp.MustCompile(`(?i)(?:ст\.|стать[яиюеё]й?)\s*(\d+(?:\.\d+)?)\s*(ТК|ГК)\s*РФ`)

// Citations extracts article references and checks them against the base.
func (k *Knowledge) Citations(text string) []Citation {
	seen := map[string]bool{}
	var out []Citation
	for _, m := range citeRe.FindAllStringSubmatch(text, -1) {
		ref := fmt.Sprintf("ст. %s %s РФ", m[1], strings.ToUpper(m[2]))
		if seen[ref] {
			continue
		}
		seen[ref] = true
		c := Citation{Ref: ref}
		if ch, ok := k.byRef[ref]; ok {
			c.Verified, c.Title = true, ch.Title
		}
		out = append(out, c)
	}
	return out
}

// Format renders chunks for the prompt.
func Format(chunks []Chunk) string {
	var b strings.Builder
	for _, c := range chunks {
		fmt.Fprintf(&b, "## %s, ст. %s. %s\n%s\n\n", c.Code, c.Num, c.Title, c.Text)
	}
	return b.String()
}
