package schemas

#Solver: {
  name: string
  humanId?: =~"^[a-z0-9-]+$"
}

#Solved: {
  id:               =~"^[a-z0-9-]+$"
  number:           int & >=1 & <=200
  title:            string
  year:             string
  solvers:          [...#Solver] & [#Solver, ...]
  verificationType: "formal" | "peer-reviewed" | "historical proof" | "relative consistency"
  verification:     string
  source:           =~"^https?://"
  formula?:         string
}
