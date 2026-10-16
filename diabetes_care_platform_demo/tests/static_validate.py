from pathlib import Path
import ast
root=Path.cwd().parents[1]
for file in (root/'src/pipelines').glob('*.py'):
 ast.parse(file.read_text())
 assert 'placeholder' not in file.read_text().lower()
print('Static pipeline validation passed')
