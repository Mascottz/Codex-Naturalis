package schemas

#Definition: {
  term:        string
  explanation: string
  entryId:     =~"^[a-z0-9-]+$"
}

#DeskRecord: {
  problemId:      =~"^[a-z0-9-]+$"
  definitions:    [...#Definition]
  relatedEntries: [...=~"^[a-z0-9-]+$"]
  machines:       [...#Machine]
}
