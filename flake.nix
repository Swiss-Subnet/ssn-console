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
      in {
        devShells.default = pkgs.mkShell {
          buildInputs = [
            rustToolchain
            dfx

            pkgs.bun
            pkgs.nodejs_22
            pkgs.openssl
          ];

          shellHook = ''
            echo "SSN Console dev shell"
            echo "  Rust:  $(rustc --version)"
            echo "  Bun:   $(bun --version)"
            echo "  Node:  $(node --version)"
            echo "  dfx:   $(dfx --version)"
            echo "  SSL:   $(openssl version)"
          '';
        };
      }
    );
}
