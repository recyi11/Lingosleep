# BUG-002 Rain Quality Manual Acceptance

Run this after any BUG-002 audio fix reaches a browser build with real Web Audio output.

1. Open the app in a fresh browser profile or after unregistering the LingoSleep service worker.
2. Select Japanese, Simplified Chinese, Basic, Food, and Recall mode.
3. Select the `rain` background sound.
4. Set Voice volume to about 70% and Background volume to about 30%.
5. Start playback and listen through the first three vocabulary items.
6. Confirm the background reads as gentle rain texture, not plain white noise or harsh static.
7. Confirm speech remains intelligible during and after the native meaning `米饭；餐`.
8. Lower Background volume while playback is active and confirm the rain becomes quieter without stopping the session.
9. Raise Background volume while playback is active and confirm it becomes louder without suddenly overpowering speech.
10. Press Stop and confirm all rain/background sound stops within one second.

Pass criteria: rain is recognizably rain-like, volume changes are audible during active playback, speech remains clear, and Stop silences background audio promptly.
