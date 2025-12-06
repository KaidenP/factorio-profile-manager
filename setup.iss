[Setup]
AppName=Factorio Profile Manager
AppVersion=2.0.0
Compression=lzma2
DefaultDirName={localappdata}\FPM\bin
PrivilegesRequired=lowest
LicenseFile=LICENSE
DefaultGroupName=Factorio Profile Manager
OutputDir=dist
OutputBaseFilename=Factorio Profile Manager Setup

[Files]
Source: "dist\factorio-profile-manager\factorio-profile-manager-win_x64.exe"; DestDir: "{app}"
Source: "dist\factorio-profile-manager\resources.neu"; DestDir: "{app}"; Attribs: hidden;

[Icons]
Name: "{group}\Factorio Profile Manager"; Filename: "{app}\factorio-profile-manager-win_x64.exe"
Name: "{userdesktop}\Factorio Profile Manager"; Filename: "{app}\factorio-profile-manager-win_x64.exe"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "Create a &desktop icon"; GroupDescription: "Additional icons:"; Flags: unchecked

[Dirs]
Name: "{localappdata}\FPM\data"