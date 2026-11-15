# Lemno

## Installation

### If macOS says the app is damaged and cannot be opened

The current macOS release is not signed or notarized with an Apple Developer ID, so Gatekeeper may report that the app is damaged and cannot be opened. This message does not necessarily mean that the downloaded DMG is corrupted.

After copying Lemno to the Applications folder, run the following commands in Terminal:

```sh
xattr -dr com.apple.quarantine /Applications/Lemno.app
open /Applications/Lemno.app
```
