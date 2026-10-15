$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$planRes = Invoke-RestMethod -Uri "http://localhost:5105/api/plan/generate" -Method Post -Body '{"tagFilter":"all","servings":2,"includeLunches":false}' -ContentType "application/json; charset=utf-8"

$ingredients = $planRes.ingredients
$sample = @($ingredients[0], $ingredients[1], $ingredients[2])
$sampleJson = $sample | ConvertTo-Json -Depth 5
$utf8Bytes2 = [System.Text.Encoding]::UTF8.GetBytes($sampleJson)

$req2 = [System.Net.WebRequest]::Create("http://localhost:5105/api/scout/list")
$req2.Method = "POST"
$req2.ContentType = "application/json; charset=utf-8"
$stream2 = $req2.GetRequestStream()
$stream2.Write($utf8Bytes2, 0, $utf8Bytes2.Length)
$stream2.Close()
$resp2 = $req2.GetResponse()
$reader2 = New-Object System.IO.StreamReader($resp2.GetResponseStream(), [System.Text.Encoding]::UTF8)
$jsonStr2 = $reader2.ReadToEnd()
$reader2.Close()

$scoutRes = $jsonStr2 | ConvertFrom-Json
Write-Output "=== SCOUT TEST RESULTS ==="
Write-Output "Spar Total: $($scoutRes.sparTotal) EUR"
Write-Output "Billa Total: $($scoutRes.billaTotal) EUR"
Write-Output "Hofer Total: $($scoutRes.hoferTotal) EUR"
Write-Output "Optimized Total: $($scoutRes.optimizedCheapestTotal) EUR"
Write-Output "Savings: $($scoutRes.potentialSavings) EUR"

foreach ($item in $scoutRes.items) {
    Write-Output "`nIngredient: $($item.name) -> Recommended: $($item.recommendedStore) ($($item.recommendedPrice) EUR)"
    foreach ($prod in $item.availableProducts) {
        Write-Output "   [$($prod.store)] $($prod.brand) - $($prod.name): $($prod.price) EUR (Unit: $($prod.unitPrice))"
    }
}
