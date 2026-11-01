import os
from flask_sqlalchemy import SQLAlchemy

# Create the SQLAlchemy object without binding to an app yet (application factory pattern)
# This will be initialized in app.py via db.init_app(app)

db = SQLAlchemy()

