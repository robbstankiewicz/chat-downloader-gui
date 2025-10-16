import os
from chat_downloader import formatting

formatting_dir = formatting.__path__[0]
source_path = os.path.join(formatting_dir, "custom_formats.json")

a = Analysis(
    ['main.py'],
    pathex=[],
    binaries=[],
    datas=[
        (source_path, "chat_downloader/formatting"),
        ("alembic.ini", "."),
        ("alembic", "alembic"),
    ],
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='main',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
