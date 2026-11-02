class_name Arte
## Arte: carrega as imagens e as fichas (json) das pranchas uma vez só e guarda.

static var _tex := {}
static var _json := {}

static func tex(caminho: String) -> Texture2D:
	if not _tex.has(caminho):
		_tex[caminho] = load(caminho) if ResourceLoader.exists(caminho) else null
	return _tex[caminho]

static func json(caminho: String) -> Variant:
	if not _json.has(caminho):
		var f := FileAccess.open(caminho, FileAccess.READ)
		_json[caminho] = JSON.parse_string(f.get_as_text()) if f else null
	return _json[caminho]
