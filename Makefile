# small machines; the build. it turns typed source into a quiet static book.

.PHONY: compute check serve clean

compute:
	@mkdir -p site/data
	@cp data/entries.json data/humans.json data/problems.json data/attempts.json data/solved.json data/desk.json site/data/
	@rm -rf site/solutions site/machines
	@mkdir -p site/solutions site/machines
	@cp -R solutions/. site/solutions/
	@cp scripts/*.jl site/machines/
	@if command -v julia >/dev/null 2>&1 && \
		julia scripts/phyllotaxis.jl > site/data/phyllotaxis.json && \
		julia scripts/lorenz.jl > site/data/lorenz.json && \
		julia scripts/galaxy_rotation.jl > site/data/galaxy-rotation.json && \
		julia scripts/three_body.jl > site/data/three-body.json && \
		julia scripts/jeans_mass.jl > site/data/jeans-mass.json && \
		julia scripts/eddington.jl > site/data/eddington.json && \
		julia scripts/schechter.jl > site/data/schechter.json; then \
		:; \
	else \
		python3 scripts/compute_fallback.py; \
	fi
	@if command -v julia >/dev/null 2>&1; then \
		julia scripts/hubble_tension.jl; \
		julia scripts/rubik_group_order.jl; \
	fi
	@printf '%s\n' 'compute; the small machines have written site/data'

check: compute
	@if command -v rustc >/dev/null 2>&1; then \
		rustc referee/src/main.rs -O -o referee/codex-referee && ./referee/codex-referee site/data .; \
	else \
		python3 scripts/check.py; \
	fi
	@if command -v julia >/dev/null 2>&1; then julia solutions/c2-silent-board/witness.jl; fi

serve: compute
	@python3 -m http.server 4173 --bind 0.0.0.0 --directory site

clean:
	@rm -f referee/codex-referee site/data/*.json
