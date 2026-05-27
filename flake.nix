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

  outputs = {
    nixpkgs,
    rust-overlay,
    flake-utils,
    ...
  }:
    flake-utils.lib.eachDefaultSystem (
      system: let
        overlays = [(import rust-overlay)];
        pkgs = import nixpkgs {inherit system overlays;};

        rustToolchain = pkgs.rust-bin.stable."1.92.0".default.override {
          extensions = ["rustfmt" "clippy"];
          targets = ["wasm32-unknown-unknown"];
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

        dfxVersion = "0.31.0";
        dfx = let
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

        icpCliVersion = "0.2.7";
        icp-cli = let
          platformMap = {
            "x86_64-linux" = {
              triple = "x86_64-unknown-linux-gnu";
              hash = "sha256-vGJy/AAE0XU4xlDPyLrO3UZK6GUn7+Fy7TtJmj4Pd5g=";
            };
            "aarch64-linux" = {
              triple = "aarch64-unknown-linux-gnu";
              hash = "sha256-8FLrrasFLsTmzLpOiifiss1BXXWt9ok9HxFxBtOVBPE=";
            };
            "x86_64-darwin" = {
              triple = "x86_64-apple-darwin";
              hash = "sha256-97lHcvwiNaNpnJib1TySNyLwJf40N1w1aHK1ie4Rvng=";
            };
            "aarch64-darwin" = {
              triple = "aarch64-apple-darwin";
              hash = "sha256-J5YFalOpgwVYs1O3AsFocd2rMFr35ztkH5vNp5Xhz74=";
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
      in {
        devShells.default = pkgs.mkShell {
          buildInputs = [
            rustToolchain
            dfx
            icp-cli
            canbench

            pkgs.bun
            pkgs.nodejs_22
            pkgs.openssl
            pkgs.just
            pkgs.go
          ];

          shellHook = ''
            if [ -t 1 ]; then
              echo "SSN Console: rust ${rustToolchain.version or "$(rustc --version)"} | bun ${pkgs.bun.version} | node ${pkgs.nodejs_22.version} | dfx ${dfxVersion} | icp-cli ${icpCliVersion} | ssl ${pkgs.openssl.version} | just ${pkgs.just.version} | canbench ${canbenchVersion} | go ${pkgs.go.version}"
            fi
          '';
        };
      }
    );
}
