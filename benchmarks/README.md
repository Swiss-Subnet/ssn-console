# Benchmarks

This folder contains the configuration for canbench benchmarks used for the various
SSN console canisters as well as their results.

## Installing canbench in your environment

Simply run

```shell
cargo install canbench
```

## Running benchmarks

- Navigate to the sub-folder you are interested in, e.g.
  ```shell
  cd benchmarks/cycles-monitor
  ```
- Run benchmarks
  ```shell
  canbench
  ```

If you want to persist results of a benchmark, run

```shell
canbench --persist
```
