package schemas

#Attempt: {
  id:          =~"^[a-z0-9-]+$"
  name:        string
  date:        =~"^[0-9]{4}-[0-9]{2}-[0-9]{2}$"
  problemId:   string
  link:        =~"^https?://"
  status:      "attempted" | "under review" | "verified" | "withdrawn"
  claim:       string
  reviewNote?: string
  solutionPath?: =~"^solutions/[a-z0-9-]+/[a-z0-9._-]+$"
  solutionType?: "proof" | "julia" | "rust"
  command?:    string
  output?:     string
  verification?: string
}
