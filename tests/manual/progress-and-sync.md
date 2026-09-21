# Progress and sync regression checklist

Use a disposable browser profile and test Supabase project; never enter a production sync code into automated tests.

## Automated helper checks

Run `node --experimental-strip-types --test tests/unit/playback-progress.test.mjs` (Node 22+).

## Resume and variety

1. Start a sequential session, finish two words, return to setup. The next word preview must match the next playback item.
2. Refresh and verify the same preview and resume position. Playback must require a tap (no autoplay).
3. Finish a full playlist, then three more words. Stop and refresh: continue from the fourth word, not the first. This reproduces the previous saturated-cursor bug.
4. In Playlist, shuffle, finish two words, refresh. Both the shuffled order and its position must survive. Switch topics and return: each topic keeps its own order.
5. Use Random. New/unmastered words should precede otherwise-equivalent mastered words; recently played words should be deferred. Each complete cycle must contain every word once and a new cycle must not immediately repeat its last word (except a one-word list).

## Persistence and sync

1. Without a sync code, setup and player must say the data is local only. No cloud-success claim should appear.
2. Simulate localStorage quota/write failure. The app must keep rendering and show a warning not to close the page; it must not claim successful local saving.
3. With a disposable test sync account, delay save_temp_account, change a setting during the request, then release it. The old response must not mark newer changes as synced; a subsequent request should save the latest payload.
4. Fail save_temp_account. The status must show failure and local data must remain. Retry Save now and check the successful status.
5. Fail get_temp_account on startup. The control must say Retry connection, not attempt an upload before loading succeeds.
6. Return null or an unsupported version from get_temp_account. Existing local data must not be cleared.
7. Copying a code must not replace a sync failure/pending indicator with a success message.
8. Verify playlistSeeds round-trips through the temporary-account JSON payload; old payloads without it use the original ordering.
9. Fail the vocabulary read. Bundled words must remain playable, with a visible fallback notice.

## Device checks still required

On actual iPhone/iPad Safari: lock and unlock during playback, pause/resume, reload, and repeat with a temporary network loss. Desktop or helper tests do not establish iOS background playback reliability.

Cloud sync still uses the existing whole-payload temporary-account protocol, not automatic multi-device merging. Unsynced local changes must block cloud replacement on startup and retry, presenting a choice of local upload or remote replacement. Remote replacement first creates a local backup at `lingosleep-before-cloud-replace`; if backup fails it must be cancelled.

10. Delay get_temp_account and change favorites or complete words. Confirm local edits remain and the conflict choice appears. Repeat after offline edits and a full reload.
11. Load cloud metadata for an ID before the remote vocabulary containing that ID. After vocabulary arrives, its favorite/count/mastery must survive and the next upload must include them.
12. Resume a saved shuffled playlist while remote vocabulary is delayed. New words must append without reordering the saved IDs.
