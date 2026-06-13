ORGANIZATION_EXISTS_MESSAGE = "Organization already exists"


def normalize_organization_name(name: str) -> str:
    """Trim whitespace and lowercase for case-insensitive comparison."""
    return name.strip().lower()
