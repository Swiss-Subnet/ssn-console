# Building and Installing a Custom Pocket IC

This guide explains how to build a custom `pocket-ic-server` from the DFINITY `ic` repository and install it into your local `dfx` cache. This is useful when you need to test changes to the Pocket IC server itself or use an unreleased version.

## Build the custom binary

First, within the `ic` monorepo, use the provided container script to ensure you have the correct build environment. You can enter the container or use it to run commands.

```bash
./ci/container/container-run.sh
```

Build the `pocket-ic-server` target using Bazel:

```bash
bazel build --config=local //rs/pocket_ic_server:pocket-ic-server
```

Verify the binary was built successfully:

```bash
ls -lh bazel-bin/rs/pocket_ic_server/pocket-ic-server
```

Copy the built binary out of the Bazel `bazel-bin` directory (and resolve any symlinks) to your current directory:

```bash
./ci/container/container-run.sh cp -L bazel-bin/rs/pocket_ic_server/pocket-ic-server ./pocket-ic-server
```

## Install into dfx cache

Next, you need to replace the `pocket-ic` binary that `dfx` uses under the hood.

Find out where your current `dfx` cache is located and see the existing tools:

```bash
ls -la $(dfx cache show)
```

Back up the existing `pocket-ic` binary in case you need to revert:

```bash
mv $(dfx cache show)/pocket-ic $(dfx cache show)/pocket-ic.bak
```

_(Note: If you need to restore the backup later, you can run: `mv $(dfx cache show)/pocket-ic.bak $(dfx cache show)/pocket-ic`)_

If you need to remove the existing binary manually (e.g., due to permissions), you can remove it:

```bash
sudo rm $(dfx cache show)/pocket-ic
```

Finally, copy your newly built custom `pocket-ic-server` into the `dfx` cache directory, naming it `pocket-ic`:

```bash
cp ./pocket-ic-server $(dfx cache show)/pocket-ic
```

Your local `dfx` environment and tests will now use the custom Pocket IC binary.
