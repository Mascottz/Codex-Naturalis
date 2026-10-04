package schemas

#Entry: {
  id:          =~"^[a-z0-9-]+$"
  number:      int & >=1 & <=24
  domain:      "sky" | "earth" | "living" | "invisible" | "structure"
  title:       string
  formula:     string
  originators: [...string] & [string, ...]
  year:        string
  statement:   string
  derivation:  string
  intuition:   string
  visualType:  string
  source:      string
  status:      "live" | "planned"
  slider?: {
    label: string
    min: number
    max: number
    step: number
    value: number
  }
}
