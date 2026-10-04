package schemas

#Control: {
  key?:   string
  label:  string
  min:    number
  max:    number
  step:   number
  value:  number
}

#Source: {
  title: string
  url:   string
}

#Machine: {
  title:       string
  path:        string
  command:     string
  description: string
}

#Entry: {
  id:          =~"^[a-z0-9-]+$"
  number:      int & >=1 & <=30
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
  slider?:   #Control
  controls?: [...#Control]
  sources?:  [...#Source]
  machine?:  #Machine
  story?:       string
  caption?:     string
  openProblem?: bool
}
