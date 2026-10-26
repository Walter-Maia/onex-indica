# Refaz assets/js/parallax-camadas.js: as camadas do parallax (assets/img/parallax/*.webp) em data URI, só para abrir
# as páginas em file:// (lá o navegador não deixa o script ler os pixels das fotos). Rode depois de trocar as camadas:
#   powershell -File qa/scripts/gera-camadas-js.ps1
$raiz = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$linhas = @('/* Gerado por qa/scripts/gera-camadas-js.ps1: as camadas do parallax em data URI, só para abrir a página em file:// */', 'window.PARALLAX_CAMADAS = {')
$arqs = @('1-serra', '2-onex', '4-frente')
for ($i = 0; $i -lt $arqs.Count; $i++) {
  $b = [Convert]::ToBase64String([IO.File]::ReadAllBytes((Join-Path $raiz "assets\img\parallax\$($arqs[$i]).webp")))
  $v = if ($i -lt $arqs.Count - 1) { ',' } else { '' }
  $linhas += "  `"assets/img/parallax/$($arqs[$i]).webp`": `"data:image/webp;base64,$b`"$v"
}
$linhas += '};'
[IO.File]::WriteAllText((Join-Path $raiz 'assets\js\parallax-camadas.js'), ($linhas -join "`n") + "`n")
