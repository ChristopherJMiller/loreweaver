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
      in {
        devShells.default = pkgs.mkShell {
          nativeBuildInputs = with pkgs; [
            # Rust
            rustToolchain
            cargo-tauri

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
