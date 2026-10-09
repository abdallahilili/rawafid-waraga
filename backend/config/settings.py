"""
Configuration du projet Gestion Papeterie & Imprimerie.
Toutes les variables d'environnement et parametres metier utilisent des
noms francais, a l'exception des attributs impose par Django/DRF/SimpleJWT
(ex: password, is_active, last_login) qui restent en anglais cote code
Python mais sont mappes sur des colonnes francaises en base.
"""

from pathlib import Path
from datetime import timedelta
import os

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

CLE_SECRETE = os.getenv("CLE_SECRETE", "cle-de-developpement-non-securisee")
SECRET_KEY = CLE_SECRETE
DEBUG = os.getenv("DEBUG", "1") == "1"

ALLOWED_HOSTS = ["*"]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "apps.commun",
    "apps.utilisateurs",
    "apps.depots",
    "apps.articles",
    "apps.fournisseurs",
    "apps.stock",
    "apps.achats",
    "apps.impression",
    "apps.ventes",
    "apps.caisse",
    "apps.facturation",
    "apps.rapports",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

UTILISER_SQLITE = os.getenv("UTILISER_SQLITE", "0") == "1"

if UTILISER_SQLITE:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.mysql",
            "NAME": os.getenv("BD_NOM", "papeterie"),
            "USER": os.getenv("BD_UTILISATEUR", "root"),
            "PASSWORD": os.getenv("BD_MOT_DE_PASSE", ""),
            "HOST": os.getenv("BD_HOTE", "127.0.0.1"),
            "PORT": os.getenv("BD_PORT", "3306"),
            "OPTIONS": {"charset": "utf8mb4"},
        }
    }

AUTH_USER_MODEL = "utilisateurs.Utilisateur"

AUTH_PASSWORD_VALIDATORS = []

LANGUAGE_CODE = "fr-fr"
TIME_ZONE = "Africa/Nouakchott"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_PAGINATION_CLASS": "apps.commun.pagination.PaginationStandard",
    "PAGE_SIZE": 20,
    "SEARCH_PARAM": "recherche",
    "ORDERING_PARAM": "tri",
    "EXCEPTION_HANDLER": "apps.commun.exceptions.gestionnaire_exceptions",
    "DEFAULT_RENDERER_CLASSES": (
        "rest_framework.renderers.JSONRenderer",
    ),
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=8),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

ORIGINES_CORS = os.getenv(
    "ORIGINES_CORS", "http://localhost:5173,http://127.0.0.1:5173"
).split(",")
CORS_ALLOWED_ORIGINS = [o.strip() for o in ORIGINES_CORS if o.strip()]
