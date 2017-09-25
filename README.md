# trace-evaluations

This project houses scripts to aid in analyzing large sets of traces collected with [lighthouse](/GoogleChrome/lighthouse).

## Processing Traces

```
$ node ./bin/process.js
Options:
  --help           Show help                                           [boolean]
  --version        Show version number                                 [boolean]
  --processor, -p                                            [string] [required]
  --input, -i                                                [string] [required]
  --output, -o                                               [string] [required]
  --limit, -l                                       [number] [default: Infinity]
```

### Extract Metrics from Plots Folder

```
node ./bin/process.js -p ./lib/processors/metrics-processor.js -i path/to/plots/run -o metrics.json
```

### Extract Metrics from List of Files

**list.json**
```
[
  {"path": "/path/to/folder/with/1st/lighthouse-files"},
  {"path": "/path/to/folder/with/2nd/lighthouse-files"},
  {"path": "/path/to/folder/with/3rd/lighthouse-files"},
]
```

```
node ./bin/process.js -p ./lib/processors/metrics-processor.js -i path/to/list.json -o metrics.json
```

## Analyzing Different Runs

```
$ node ./bin/analyze.js
Options:
  --help          Show help                                            [boolean]
  --version       Show version number                                  [boolean]
  --analyzer, -a                                             [string] [required]
  --input, -i                                                 [array] [required]
  --output, -o                                               [string] [required]
  --split, -s                                              [number] [default: 8]
  --limit, -l                                       [number] [default: Infinity]
```

### Analyze Lighthouse FastMode Performance
```
node ./bin/analyze.js -a ./lib/analyzers/fast-mode-accuracy-analyzer.js -i path/to/throttled-run -i path/to/unthrottled-run -o analysis.json
```
