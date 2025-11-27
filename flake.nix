{
  description = "Loreweaver - Tauri v2 application";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    rust-overlay = {
      url = "github:oxalica/rust-overlay";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { self, nixpkgs, flake-utils, rust-overlay }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          overlays = [ rust-overlay.overlays.default ];
        };

        rustToolchain = pkgs.rust-bin.stable.latest.default.override {
          extensions = [ "rust-src" "rust-analyzer" ];
        };

        # SeaORM CLI for entity generation (matching SeaORM 1.1.x)
        sea-orm-cli = pkgs.rustPlatform.buildRustPackage rec {
          pname = "sea-orm-cli";
          version = "1.1.0";

          src = pkgs.fetchCrate {
            inherit pname version;
            sha256 = "sha256-qwWXHWo3gist1pTN5GlvjwyzXDLoKYcEEspy2gxJheA=";
          };

          cargoHash = "sha256-Mg5u4k07y7fcfBILD/viM9pJywH+5UWwaT3kNV6Uu30=";

          nativeBuildInputs = with pkgs; [ pkg-config ];
          buildInputs = with pkgs; [ openssl ];

          meta = with pkgs.lib; {
            description = "Command line utility for SeaORM";
            homepage = "https://www.sea-ql.org/SeaORM/";
            license = with licenses; [ mit asl20 ];
          };
        };
      in {
        devShells.default = pkgs.mkShell {
          nativeBuildInputs = with pkgs; [
            # Rust
            rustToolchain
            cargo-tauri
            sea-orm-cli

            # Node.js
            nodejs_22
            pnpm

            # Build tools
            pkg-config
            gobject-introspection
          ];

          buildInputs = with pkgs; [
            # Tauri v2 dependencies (Linux)
            openssl
            gtk3
            cairo
            gdk-pixbuf
            glib
            libsoup_3
            webkitgtk_4_1
            librsvg
            harfbuzz
            at-spi2-atk
            pango
          ];

          shellHook = ''
            export LD_LIBRARY_PATH=${pkgs.lib.makeLibraryPath [
              pkgs.openssl
              pkgs.webkitgtk_4_1
              pkgs.gtk3
              pkgs.libsoup_3
              pkgs.glib
            ]}:$LD_LIBRARY_PATH

            export PKG_CONFIG_PATH="${pkgs.libsoup_3}/lib/pkgconfig:$PKG_CONFIG_PATH"
            export GIO_MODULE_DIR="${pkgs.glib-networking}/lib/gio/modules"
          '';
        };
      }
    );
}
