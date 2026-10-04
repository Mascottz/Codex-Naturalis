package data

import "codex.naturalis/schemas"

entry: schemas.#Entry & {
  id: "eulers-identity"
  number: 2
  domain: "sky"
  title: "Euler's identity"
  formula: "e^(iπ) + 1 = 0"
  originators: ["leonhard-euler"]
  year: "1748"
  statement: "The exponential map meets the circle at a half turn."
  derivation: "I expand the complex exponential power series at π."
  intuition: "I draw a point walking around the unit circle."
  visualType: "euler"
  source: "MacTutor History of Mathematics archive"
  status: "live"
}

problem: schemas.#Problem & {
  id: "collatz-conjecture"
  number: 8
  title: "The Collatz conjecture"
  field: "number theory"
  status: "open"
  millennium: false
  summary: "I ask whether every path reaches one."
  source: "https://oeis.org/A006577"
}

attempt: schemas.#Attempt & {
  id: "example-001"
  name: "M. Rivera"
  date: "2025-04-12"
  problemId: "collatz-conjecture"
  link: "https://github.com/Mascottz/codex-naturalis-/pull/1"
  status: "attempted"
  claim: "I record a computational exploration, not a proof."
}
