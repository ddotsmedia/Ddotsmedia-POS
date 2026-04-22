; Ddotsmedia POS custom NSIS installer script
!macro customHeader
  !system "echo Ddotsmedia POS Installer"
!macroend

!macro customInstall
  ; Add to Windows Firewall (allow POS through firewall)
  DetailPrint "Configuring Windows Firewall..."
  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="Ddotsmedia POS" dir=in action=allow program="$INSTDIR\Ddotsmedia POS.exe" enable=yes'
!macroend

!macro customUnInstall
  ; Remove Firewall rule on uninstall
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="Ddotsmedia POS"'
!macroend
