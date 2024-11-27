{
  description = "SASyLF";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-parts.url = "github:hercules-ci/flake-parts";
  };

  outputs = inputs@{ flake-parts, ... }:
    flake-parts.lib.mkFlake { inherit inputs; } {
      systems = [
        "aarch64-darwin"
      ];

      perSystem = { self', pkgs, ... }:
        let
          jdk = pkgs.jdk21;
        in
        {
          devShells.default = pkgs.mkShell {
            name = "SASyLF";

            buildInputs = with pkgs; [ jdk jdt-language-server maven ];

            shellHook = ''
              export JAVA_HOME=${jdk}
              PATH="${jdk}/bin:$PATH"
            '';
          };

          packages.sasylf-jar =
            pkgs.stdenv.mkDerivation {
              pname = "SASyLF";
              version = "1.5.1";

              src = ./.;

              buildInputs = with pkgs; [ jdk javacc maven ];

              buildPhase = ''
                # Create a temporary maven repository
                mkdir -p $TMPDIR/.m2/repository

                # Run maven with custom repository location
                mvn clean package \
                  -pl sasylf \
                  -Dmaven.repo.local=$TMPDIR/.m2/repository
              '';


              installPhase = ''
                mkdir -p $out/bin
                cp sasylf/target/sasylf-*.jar $out/bin/SASyLF.jar
              '';
            };

          packages.sasylf =
            let
              sasylfScript = pkgs.writeShellScriptBin "sasylf" ''
                # Run the SASyLF.jar file
                java -jar ${self'.packages.sasylf-jar}/bin/SASyLF.jar $@
              '';
            in
            pkgs.symlinkJoin {
              name = "sasylf";
              buildInputs = [ self'.packages.sasylf-jar pkgs.makeWrapper ];
              paths = [ sasylfScript ];
              postBuild = "wrapProgram $out/bin/sasylf --prefix PATH : $out/bin";
            };

          packages.default = self'.packages.sasylf;
        };
    };
}