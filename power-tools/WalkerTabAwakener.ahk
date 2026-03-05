; ==========================================================
; WalkerTabAwakener.ahk (v1.4)
; Description: Smart Tab Wake-up Helper (Arrival Shock only)
; Target: Chrome, Firefox (incl. Portable), Edge
; ==========================================================
#Requires AutoHotkey v2.0
#SingleInstance Force

; --- 1. グローバル変数の初期化 ---
lastWakeTime := 0  ; 二重発火防止用のタイムスタンプ

; --- 2. ブラウザグループの定義 ---
GroupAdd "WalkerBrowsers", "ahk_class MozillaWindowClass" ; Firefox
GroupAdd "WalkerBrowsers", "ahk_class Chrome_WidgetWin_1"  ; Chrome/Edge

; --- 3. タイマー設定 ---
; [Title Hunter] 100ms周期でアクティブ窓を監視するスナイパー待機
SetTimer WatchForWake, 100

; --- 4. 監視ロジック (Arrival Shock) ---
WatchForWake() {
    global lastWakeTime
    if WinActive("ahk_group WalkerBrowsers") {
        try {
            Title := WinGetTitle("A")
            ; [WAKE]が含まれ、かつ前回の発火から1000ms以上経過している場合のみ実行
            if InStr(Title, "[WAKE]") && (A_TickCount - lastWakeTime > 1000) {
                lastWakeTime := A_TickCount
                ReclaimFocus()
            }
        }
    }
}

; --- 5. 手動覚醒シグナル (Alt + F24) ---
; 他ツールからの強制覚醒用ルート（予約）
$!F24::
{
    global lastWakeTime
    lastWakeTime := A_TickCount
    ReclaimFocus()
}

; --- 6. 共通覚醒アクション (Silent Mode) ---
ReclaimFocus() {
    ; JSの実行凍結(Execution Dormancy)を解除するための単発の物理パルス
    ; PowerToys等のツールと競合しないよう、Ctrlの空打ち1回に純化
    Send "{Ctrl down}{Ctrl up}"
}