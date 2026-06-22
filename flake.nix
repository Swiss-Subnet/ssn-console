{
  description = "SSN Console development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    rust-overlay = {
      url = "github:oxalica/rust-overlay";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      nixpkgs,
      rust-overlay,
      flake-utils,
      ...
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        overlays = [ (import rust-overlay) ];
        pkgs = import nixpkgs { inherit system overlays; };

        goVersion = "1.26.4";
        go = pkgs.go_1_26.overrideAttrs (old: {
          version = goVersion;
          src = pkgs.fetchurl {
            url = "https://go.dev/dl/go${goVersion}.src.tar.gz";
            hash = "sha256-T2aKMvv8ETLmqIH7lowvHa2mMUkqM5IRc1+7JVpCYC0=";
          };
        });

        rustToolchain = pkgs.rust-bin.stable."1.92.0".default.override {
          extensions = [
            "rustfmt"
            "clippy"
          ];
          targets = [ "wasm32-unknown-unknown" ];
        };

        canbenchVersion = "0.6.0";
        canbench = pkgs.rustPlatform.buildRustPackage {
          pname = "canbench";
          version = canbenchVersion;
          src = pkgs.fetchCrate {
            pname = "canbench";
            version = canbenchVersion;
            hash = "sha256-piCCL8BVDZnwtGcWp7BxJgDJxkaZ/h58HAt8pmFhpIA=";
          };
          cargoHash = "sha256-ixgerqJ5UwPOWUzhtZ1yAh9HpcOJ6eYQUVrdYaUwSR4=";
          doCheck = false;
        };

        icWasmVersion = "0.9.11";
        ic-wasm =
          let
            platformMap = {
              "x86_64-linux" = {
                triple = "x86_64-unknown-linux-gnu";
                hash = "sha256-Wu6kraRnSKS2nm2X2TQHSmTEXaQnKIJBIQPM4RCq+Gs=";
              };
              "aarch64-linux" = {
                triple = "aarch64-unknown-linux-gnu";
                hash = "sha256-VvFQvj5BP5Y330tPpBlQx505z3OJab4CMb+uN6xPOxo=";
              };
              "x86_64-darwin" = {
                triple = "x86_64-apple-darwin";
                hash = "sha256-NiCqZWN0Eo2OqvFJ/3GS3lBhLQ4UCEYFL3OTF/qjYhk=";
              };
              "aarch64-darwin" = {
                triple = "aarch64-apple-darwin";
                hash = "sha256-LkfVFib1G4EaS6MdVVB2CVmP9LzLbFBnUJD93BaQRwM=";
              };
            };
            platformInfo = platformMap.${system};
          in
          pkgs.stdenv.mkDerivation {
            pname = "ic-wasm";
            version = icWasmVersion;
            src = pkgs.fetchurl {
              url = "https://github.com/dfinity/ic-wasm/releases/download/${icWasmVersion}/ic-wasm-${platformInfo.triple}.tar.xz";
              hash = platformInfo.hash;
            };
            # Release tarball nests the binary under ic-wasm-<triple>/ic-wasm.
            sourceRoot = "ic-wasm-${platformInfo.triple}";
            installPhase = ''
              mkdir -p $out/bin
              cp ic-wasm $out/bin/
              chmod +x $out/bin/ic-wasm
            '';
          };

        candidExtractorVersion = "0.1.6";
        candid-extractor = pkgs.rustPlatform.buildRustPackage {
          pname = "candid-extractor";
          version = candidExtractorVersion;
          src = pkgs.fetchCrate {
            pname = "candid-extractor";
            version = candidExtractorVersion;
            hash = "sha256-MTLhYGcrGaLc84YjX2QXMsY4+UrxDvWpFVBw5WZxnN8=";
          };
          cargoHash = "sha256-Mq2tO8gD7v5P7NGH+R4QkyA7jRXo4knIi+eoGT4JzuU=";
          doCheck = false;
        };

        dfxVersion = "0.31.0";
        dfx =
          let
            platformMap = {
              "x86_64-linux" = {
                platform = "x86_64-linux";
                hash = "sha256-VeIw/b0C/G4R1xdk91JkBgSri/XABC64OirCp4RuU+c=";
              };
              "aarch64-linux" = {
                platform = "aarch64-linux";
                hash = "sha256-ylzTaBkY6sa98x3e/7hdBPDzDtYpDs2AFLfBm/0gNHs=";
              };
              "x86_64-darwin" = {
                platform = "x86_64-darwin";
                hash = "sha256-iPYP8y80dRr1lDlUFCjI0QVZRrTW899hOvxCXP53OE8=";
              };
              "aarch64-darwin" = {
                platform = "aarch64-darwin";
                hash = "sha256-k/tg4pEd1AbnksgNnpQh2rz6dvheqwzpwfiAidB19no=";
              };
            };
            platformInfo = platformMap.${system};
          in
          pkgs.stdenv.mkDerivation {
            pname = "dfx";
            version = dfxVersion;
            src = pkgs.fetchurl {
              url = "https://github.com/dfinity/sdk/releases/download/${dfxVersion}/dfx-${dfxVersion}-${platformInfo.platform}.tar.gz";
              hash = platformInfo.hash;
            };
            sourceRoot = ".";
            installPhase = ''
              mkdir -p $out/bin
              cp dfx $out/bin/
              chmod +x $out/bin/dfx
            '';
          };

        icpCliVersion = "0.3.2";
        icp-cli =
          let
            platformMap = {
              "x86_64-linux" = {
                triple = "x86_64-unknown-linux-gnu";
                hash = "sha256-Y3FH+NHCzaNWkMf1KuHNh53CSZ2RiCg2GwELj2ovRic=";
              };
              "aarch64-linux" = {
                triple = "aarch64-unknown-linux-gnu";
                hash = "sha256-MOg3fMPzDUDEAozgTuSzW2xxeSkTTw0mZ/oTp+O9tXE=";
              };
              "x86_64-darwin" = {
                triple = "x86_64-apple-darwin";
                hash = "sha256-nlUsHLRGi6WKaLZucSRUsb/S3eZzTGFsz4r8gkp2S1M=";
              };
              "aarch64-darwin" = {
                triple = "aarch64-apple-darwin";
                hash = "sha256-cD0bSofV6vVlhTDY8xDO7jucMiD6BQTZc7BF2Y3x3j4=";
              };
            };
            platformInfo = platformMap.${system};
          in
          pkgs.stdenv.mkDerivation {
            pname = "icp-cli";
            version = icpCliVersion;
            src = pkgs.fetchurl {
              url = "https://github.com/dfinity/icp-cli/releases/download/v${icpCliVersion}/icp-cli-${platformInfo.triple}.tar.xz";
              hash = platformInfo.hash;
            };
            # Release tarball nests the binary under icp-cli-<triple>/icp.
            sourceRoot = "icp-cli-${platformInfo.triple}";
            installPhase = ''
              mkdir -p $out/bin
              cp icp $out/bin/
              chmod +x $out/bin/icp
            '';
          };

        # The launcher boots pocket-ic; its version maps 1:1 to a pocket-ic
        # version, so this is what pins pocket-ic (icp-cli ships no pocket-ic).
        # icp finds it via ICP_CLI_NETWORK_LAUNCHER_PATH (set in shellHook), and
        # the launcher expects pocket-ic as a sibling, so both land in $out/bin.
        # SSN fork: adds local-network support for cycles-monitor's canister_metrics.
        launcherVersion = "14.0.0-2026-06-12-04-52.ssn1";
        icp-cli-network-launcher =
          let
            platformMap = {
              "x86_64-linux" = {
                asset = "x86_64-linux";
                hash = "sha256-gk3JCo/m+IZJ4bog6LNrUBpznG/s31sksXzc9x+5ssk=";
              };
              "aarch64-linux" = {
                asset = "arm64-linux";
                hash = "sha256-PViQIJbRS1A6Uar4CWtgfHuZlaIMNkOfL3dYdw+wUhA=";
              };
              "x86_64-darwin" = {
                asset = "x86_64-darwin";
                hash = "sha256-rS1yc3sxLwOrA60Q/ixmayekHhwV4bbQcij14JmqXyQ=";
              };
              "aarch64-darwin" = {
                asset = "arm64-darwin";
                hash = "sha256-me9nwOjGCnsneWXBP8MIWYMHtzyWOfjvL2HZQO7MlQo=";
              };
            };
            platformInfo = platformMap.${system};
            archive = "icp-cli-network-launcher-${platformInfo.asset}-v${launcherVersion}";
          in
          pkgs.stdenv.mkDerivation {
            pname = "icp-cli-network-launcher";
            version = launcherVersion;
            src = pkgs.fetchurl {
              url = "https://github.com/Swiss-Subnet/icp-cli-network-launcher/releases/download/v${launcherVersion}/${archive}.tar.gz";
              hash = platformInfo.hash;
            };
            sourceRoot = archive;
            installPhase = ''
              mkdir -p $out/bin
              cp icp-cli-network-launcher pocket-ic $out/bin/
              chmod +x $out/bin/icp-cli-network-launcher $out/bin/pocket-ic
            '';
          };
        versions = pkgs.writeShellScriptBin "versions" ''
          echo "  langs:   rust ${
            rustToolchain.version or "$(rustc --version)"
          } | go ${go.version} | node ${pkgs.nodejs_22.version} | bun ${pkgs.bun.version}"
          echo "  ic:      dfx ${dfxVersion} | icp-cli ${icpCliVersion} | pocket-ic ${launcherVersion} | candid-extractor ${candidExtractorVersion} | ic-wasm ${icWasmVersion}"
          echo "  build:   just ${pkgs.just.version} | canbench ${canbenchVersion} | gettext ${pkgs.gettext.version} | openssl ${pkgs.openssl.version}"
          echo "  lint:    golangci-lint ${pkgs.golangci-lint.version} | actionlint ${pkgs.actionlint.version} | shellcheck ${pkgs.shellcheck.version}"
          echo "  runtime: podman ${pkgs.podman.version} | podman-compose ${pkgs.podman-compose.version} | jq ${pkgs.jq.version}"
        '';
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = [
            rustToolchain
            dfx
            icp-cli
            icp-cli-network-launcher
            candid-extractor
            ic-wasm
            canbench
            versions

            pkgs.bun
            pkgs.nodejs_22
            pkgs.openssl
            pkgs.just
            go
            pkgs.jq
            pkgs.gettext
            pkgs.podman
            pkgs.podman-compose
            pkgs.golangci-lint
            pkgs.actionlint
            pkgs.shellcheck
          ];

          shellHook = ''
            export ICP_CLI_NETWORK_LAUNCHER_PATH="${icp-cli-network-launcher}/bin/icp-cli-network-launcher"

            # The nix `go` is exactly 1.26.4 (agent-go's floor), so forbid the
            # toolchain-download path: builds use the nix-store compiler, never
            # fetch one. Offline/CI-safe.
            export GOTOOLCHAIN=local

            # Image-mode networks run via podman. icp-cli speaks the Docker API,
            # so point it at the podman machine's gvproxy socket. And icp mounts
            # its status dir from TMPDIR -- nix's TMPDIR (/tmp/nix-shell-*) is not
            # shared into the podman VM, so move TMPDIR under $HOME, which is.
            if podman machine inspect >/dev/null 2>&1; then
              _ssn_podman_sock="$(lsof -U 2>/dev/null | grep -oE '/[^ ]*/podman/podman-machine-default-api.sock' | head -1)"
              [ -S "''${_ssn_podman_sock:-}" ] && export DOCKER_HOST="unix://$_ssn_podman_sock"
              export TMPDIR="$HOME/.ssn/tmp"
              mkdir -p "$TMPDIR"
            fi

            # Prompt: path relative to repo root.
            _ssn_relpwd() {
              local root name
              root="$(git rev-parse --show-toplevel 2>/dev/null)" || { echo "\w"; return; }
              name="$(basename "$root")"
              if [ "$PWD" = "$root" ]; then echo "$name";
              else echo "$name''${PWD#$root}"; fi
            }
            PROMPT_COMMAND='PS1="(ssn) $(_ssn_relpwd) \$ "'
          '';
        };
      }
    );
}
