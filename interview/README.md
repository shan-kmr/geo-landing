# interview — One Order, Five Checks

Benchmark page: a frontier LLM vs deterministic systems across the five location steps
of a quick commerce order. Live at https://shan-kmr.github.io/geo-landing/interview/

## Layout

    index.html        the page: sections, results tables, cost tables. Edit this.
    style.css         all styling (tokens at the top, light + dark).
    parts/e*.html     generated appendices: verbatim prompt, schema, every recorded pair.
                      e5 messy · e1 geocode · e2 reverse · e3 fraud trails · e4 dwell.
                      Loaded lazily when a dropdown opens. Do not hand-edit; regenerate.
    data/summary.json scored results for all five experiments.
    watch.sh          auto-deploy watcher (below).

## Editing and deploying

Edit `index.html` or `style.css` and save. If `watch.sh` is running it commits the
change and publishes this directory to the `gh-pages` branch under `/interview`
(`gh-pages --add`, so the rest of the site is never touched). Manual deploy:

    npx gh-pages -d public/interview --dest interview --add -m "deploy: interview"

Start the watcher any time from the repo root:

    bash public/interview/watch.sh

Notes: `--add` never deletes; removing a file locally leaves it live until you prune
the gh-pages branch. Preview locally with `python3 -m http.server` from `public/`
(the dropdowns fetch `parts/`, which needs http, file:// will not load them).

## Regenerating from the experiment data

Source of truth is `~/Downloads/janus-fivestage/` (items, ground truth, raw model
returns, scorer). After a re-run or a template edit there:

    python analyze.py results/raw-output.txt   # rescore
    python export_site.py                      # re-emit this directory

The authored master for section copy is `janus-fivestage/results/template.html`;
`index.html` here is generated from it plus the recorded data.

<!-- watcher e2e test 04:06:03 -->
