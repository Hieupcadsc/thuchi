{ pkgs }: {
  deps = [
    pkgs.nodejs_20
    pkgs.npm-check-updates
    pkgs.nodePackages.typescript
    pkgs.nodePackages.typescript-language-server
  ];
} 