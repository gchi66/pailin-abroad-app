# Android Emulator Troubleshooting

## Force-stop a stuck emulator

If Android Studio reports that the emulator failed to disconnect, run this
command from the WSL terminal:

```bash
powershell.exe -NoProfile -Command "Stop-Process -Name emulator,qemu-system-x86_64 -Force -ErrorAction SilentlyContinue"
```

This force-stops the Windows Android Emulator and QEMU processes. You can then
launch the virtual device again from Android Studio's Device Manager.
