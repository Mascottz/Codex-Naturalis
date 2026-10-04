# small machines; the build. it turns typed source into a quiet static book.

.PHONY: compute check serve clean

compute:
	@mkdir -p site/data
	@cp data/entries.json data/humans.json data/problems.json data/attempts.json site/data/
	@if command -v julia >/dev/null 2>&1 && \
		julia scripts/phyllotaxis.jl > site/data/phyllotaxis.json && \
		julia scripts/lorenz.jl > site/data/lorenz.json; then \
		:; \
	else \
		python3 scripts/compute_fallback.py; \
	fi
	@printf '%s\n' 'compute; the small machines have written site/data'

check: compute
	@if command -v rustc >/dev/null 2>&1; then \
		rustc referee/src/main.rs -O -o referee/codex-referee && ./referee/codex-referee site/data; \
	else \
		python3 scripts/check.py; \
	fi

serve: compute
	@python3 -m http.server 4173 --bind 0.0.0.0 --directory site

clean:
	@rm -f referee/codex-referee site/data/*.json
