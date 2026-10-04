package schemas

#Problem: {
  id:        =~"^[a-z0-9-]+$"
  number:    int & >=1 & <=200
  title:     string
  field:     string
  status:    "open" | "under review" | "verified" | "withdrawn"
  millennium: bool
  summary:   string
  source:    string
}
