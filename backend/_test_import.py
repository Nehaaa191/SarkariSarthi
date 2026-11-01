import app
print("Import OK")
for r in app.app.url_map.iter_rules():
    print(r)

