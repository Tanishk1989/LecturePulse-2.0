param([Parameter(Mandatory=$true)][string]$OutputPath)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
    $speaker.SetOutputToWaveFile($OutputPath)
    $speaker.Speak('This is a LecturePulse verification recording. Database transactions follow the ACID properties. Atomicity means all operations succeed together or none of them do. Consistency preserves database rules. Isolation separates concurrent transactions. Durability means committed changes survive a restart. A bank transfer must debit one account and credit another in the same transaction.')
} finally {
    $speaker.Dispose()
}
Get-Item -LiteralPath $OutputPath | Select-Object FullName,Length
