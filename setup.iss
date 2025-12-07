[Setup]
AppName=Factorio Profile Manager
AppId=FPM
AppVersion=2.0.0
AppVerName=Factorio Profile Manager
Compression=lzma2
DefaultDirName={localappdata}\FPM\
PrivilegesRequired=lowest
LicenseFile=LICENSE
DefaultGroupName=Factorio Profile Manager
OutputDir=dist
OutputBaseFilename=Factorio Profile Manager Setup
SetupIconFile=resources\icons\appicon.ico
UninstallDisplayIcon={app}\appicon.ico

[Files]
Source: "dist\factorio-profile-manager\factorio-profile-manager-win_x64.exe"; DestDir: "{app}"
Source: "dist\factorio-profile-manager\resources.neu"; DestDir: "{app}"; Attribs: hidden;
Source: "resources\icons\appicon.ico"; DestDir: "{app}"

[Icons]
Name: "{group}\Factorio Profile Manager"; Filename: "{app}\factorio-profile-manager-win_x64.exe"; IconFilename: "{app}\appicon.ico"
Name: "{userdesktop}\Factorio Profile Manager"; Filename: "{app}\factorio-profile-manager-win_x64.exe"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "Create a &desktop icon"; GroupDescription: "Additional icons:"; Flags: unchecked

[Dirs]
Name: "{localappdata}\FPM\data"

[Run]
Filename: "{app}\factorio-profile-manager-win_x64.exe"; Description: "Launch Factorio Profile Manager"; Flags: nowait postinstall skipifsilent unchecked

[Code]
function InitializeUninstall(): Boolean;
var
  ResultCode: Integer;
begin
  // Ask the user
  if MsgBox('Do you want to remove all application data as well?',
            mbConfirmation, MB_YESNO) = IDYES then
  begin
    // Delete data folder
    DelTree(ExpandConstant('{app}'), True, True, True);
  end;

  Result := True;
end;