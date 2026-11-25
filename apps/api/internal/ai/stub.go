package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
	"time"
)

// Stub is a deterministic offline provider: the product works end to end
// without API keys (demo, tests). It only uses what the prompt contains.
type Stub struct{ Delay time.Duration }

// Name implements LLMProvider.
func (Stub) Name() string { return "stub" }

// Stream implements LLMProvider.
func (s Stub) Stream(ctx context.Context, req Request, onDelta func(string) error) (Usage, error) {
	var out string
	switch req.Task {
	case TaskEdit:
		out = stubEdit(req.Meta)
	case TaskExtract:
		out = stubExtract(lastUser(req))
	default:
		out = stubChat(req.System, lastUser(req))
	}
	// Stream word by word so the UI behaves like with a real model.
	for _, w := range strings.SplitAfter(out, " ") {
		if err := ctx.Err(); err != nil {
			return Usage{}, err
		}
		if err := onDelta(w); err != nil {
			return Usage{}, err
		}
		if s.Delay > 0 {
			time.Sleep(s.Delay)
		}
	}
	return Usage{PromptTokens: len([]rune(req.System)) / 4, CompletionTokens: len([]rune(out)) / 4}, nil
}

func lastUser(req Request) string {
	for i := len(req.Messages) - 1; i >= 0; i-- {
		if req.Messages[i].Role == "user" {
			return req.Messages[i].Content
		}
	}
	return ""
}

var normHeadRe = regexp.MustCompile(`(?m)^## (ТК|ГК) РФ, ст\. ([0-9.]+?)\. (.+)\n((?:.+\n?)+)`)

func stubChat(system, _ string) string {
	m := normHeadRe.FindAllStringSubmatch(system, 2)
	if len(m) == 0 {
		return "В нашей базе норм не нашлось статьи, которая прямо отвечает на этот вопрос, поэтому точный ответ не подтверждён. Сформулируйте вопрос иначе или проконсультируйтесь с юристом.\n\n(Демо-режим: ИИ-модель не подключена, ответ собран из базы норм.)"
	}
	first := m[0]
	text := strings.TrimSpace(first[4])
	sentences := regexp.MustCompile(`(?s)(.+?[.!?])(\s|$)`).FindAllString(text, 3)
	answer := strings.TrimSpace(strings.Join(sentences, ""))
	if answer == "" {
		answer = text
	}
	b := fmt.Sprintf("Коротко: %s\n\nЭто следует из ст. %s %s РФ («%s»).", answer, first[2], first[1], strings.TrimSpace(first[3]))
	if len(m) > 1 {
		b += fmt.Sprintf(" Близкая норма: ст. %s %s РФ.", m[1][2], m[1][1])
	}
	return b + "\n\n(Демо-режим: ИИ-модель не подключена, ответ собран из базы норм.)"
}

var docLineRe = regexp.MustCompile(`(?m)^\[([A-Za-z0-9_.-]+)\] (.*)$`)

func stubEdit(meta map[string]string) string {
	lines := docLineRe.FindAllStringSubmatch(meta["doc"], -1)
	if len(lines) == 0 {
		return `{"summary":"Документ пуст, менять нечего.","ops":[]}`
	}
	instr := strings.ToLower(meta["instruction"] + " " + meta["side"])
	// Anchor: the last block before the final/signature section.
	anchor := lines[len(lines)-1][1]
	for i, l := range lines {
		if strings.HasPrefix(l[1], "h-final") || strings.HasPrefix(l[1], "h-sign") {
			if i > 0 {
				anchor = lines[i-1][1]
			}
			break
		}
	}
	find := func(sub string) string {
		for _, l := range lines {
			if strings.Contains(strings.ToLower(l[2]), sub) {
				return l[1]
			}
		}
		return ""
	}
	var ops []EditOp
	summary := ""
	switch {
	case strings.Contains(instr, "конфиденц"):
		summary = "Добавлен пункт о конфиденциальности."
		ops = append(ops, EditOp{Op: "insert", After: anchor, Text: "Работник обязуется не разглашать сведения, составляющие коммерческую тайну Работодателя, ставшие ему известными в связи с исполнением трудовых обязанностей, в течение срока действия договора и трёх лет после его прекращения.", Reason: "Условие о неразглашении охраняемой законом тайны допускается как дополнительное (ст. 57 ТК РФ)."})
	case strings.Contains(instr, "работодател") || strings.Contains(instr, "employer") || strings.Contains(instr, "арендодател") || strings.Contains(instr, "займодав") || strings.Contains(instr, "исполнител"):
		summary = "Усилена позиция работодателя: конфиденциальность и материальная ответственность работника в пределах закона."
		ops = append(ops,
			EditOp{Op: "insert", After: anchor, Text: "Работник обязуется не разглашать сведения, составляющие коммерческую тайну Работодателя, ставшие ему известными в связи с исполнением трудовых обязанностей.", Reason: "Дополнительное условие о неразглашении тайны (ст. 57 ТК РФ)."},
			EditOp{Op: "insert", After: anchor, Text: "Работник несёт материальную ответственность за прямой действительный ущерб, причинённый Работодателю, в пределах, установленных Трудовым кодексом Российской Федерации.", Reason: "Ст. 238 ТК РФ: работник возмещает прямой действительный ущерб, упущенная выгода не взыскивается."},
		)
		if id := find("испытание при приёме на работу не устанавливается"); id != "" {
			ops = append(ops, EditOp{Op: "replace", ID: id, Text: "В целях проверки соответствия Работника поручаемой работе устанавливается испытание сроком 3 месяца (статья 70 ТК РФ).", Reason: "Испытание до 3 месяцев позволяет работодателю проверить работника (ст. 70 ТК РФ)."})
		}
	case strings.Contains(instr, "работник") || strings.Contains(instr, "employee") || strings.Contains(instr, "нанимател") || strings.Contains(instr, "заёмщик") || strings.Contains(instr, "заказчик"):
		summary = "Усилена позиция работника: компенсация за задержку зарплаты."
		ops = append(ops, EditOp{Op: "insert", After: anchor, Text: "При нарушении срока выплаты заработной платы Работодатель выплачивает её с процентами (денежной компенсацией) в размере не ниже одной сто пятидесятой ключевой ставки Банка России за каждый день задержки.", Reason: "Ст. 236 ТК РФ устанавливает минимальный размер компенсации."})
	default:
		summary = "Добавлен пункт об уведомлении об изменении реквизитов."
		ops = append(ops, EditOp{Op: "insert", After: anchor, Text: "Стороны обязуются письменно уведомлять друг друга об изменении адреса и иных реквизитов в течение пяти рабочих дней.", Reason: "Снижает риск споров о надлежащем уведомлении."})
	}
	b, _ := json.Marshal(EditResult{Summary: summary + " (Демо-режим: правки предложены по шаблонным правилам.)", Ops: ops})
	return string(b)
}

var (
	reINN  = regexp.MustCompile(`(?i)ИНН[\s:№]*(\d{12}|\d{10})\b`)
	reKPP  = regexp.MustCompile(`(?i)КПП[\s:№]*(\d{9})\b`)
	reOGRN = regexp.MustCompile(`(?i)ОГРН(?:ИП)?[\s:№]*(\d{15}|\d{13})\b`)
	reBIK  = regexp.MustCompile(`(?i)БИК[\s:№]*(\d{9})\b`)
	reAcc  = regexp.MustCompile(`(?i)(?:р/с|р\.с\.|расч[её]тный сч[её]т)[\s:№]*(\d{20})\b`)
	reCorr = regexp.MustCompile(`(?i)(?:к/с|к\.с\.|корр[^\s:]*\s*сч[её]т)[\s:№]*(\d{20})\b`)
	reOrg  = regexp.MustCompile(`((?:ООО|АО|ПАО|ЗАО|ИП)\s*[«"][^»"]+[»"]|ИП\s+[А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+)`)
	reAddr = regexp.MustCompile(`(?i)(?:юридический\s+)?адрес[\s:]*([^\n]+)`)
	reDir  = regexp.MustCompile(`(?i)(генеральн\S+\s+директор\S*|директор\S*)[\s:]+([А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё.]+(?:\s+[А-ЯЁ][а-яё.]+)?)`)
	reBank = regexp.MustCompile(`(?i)(?:банк[\s:]+)?((?:ПАО|АО)\s+[«"]?[А-ЯЁA-Z][^,\n«»"]*[»"]?)\s*(?:,|\n|БИК)`)
	reName = regexp.MustCompile(`(?i)ФИО[\s:]+([А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+)?)`)
)

func stubExtract(text string) string {
	f := map[string]string{}
	set := func(k string, re *regexp.Regexp, g int) {
		if m := re.FindStringSubmatch(text); m != nil {
			f[k] = strings.TrimSpace(strings.Trim(m[g], " ,;"))
		}
	}
	set("inn", reINN, 1)
	set("kpp", reKPP, 1)
	set("ogrn", reOGRN, 1)
	set("bik", reBIK, 1)
	set("account", reAcc, 1)
	set("corr_account", reCorr, 1)
	set("name", reOrg, 1)
	set("address", reAddr, 1)
	set("bank", reBank, 1)
	if m := reDir.FindStringSubmatch(text); m != nil {
		f["signer_position"] = "Генеральный директор"
		if !strings.HasPrefix(strings.ToLower(m[1]), "генеральн") {
			f["signer_position"] = "Директор"
		}
		f["signer_name"] = m[2]
		f["signer_basis"] = "Устава"
	}
	if _, ok := f["name"]; !ok {
		set("name", reName, 1)
	}
	b, _ := json.Marshal(map[string]any{"fields": f})
	return string(b)
}
