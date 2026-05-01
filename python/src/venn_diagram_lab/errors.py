"""Public exception hierarchy for venn-diagram-lab.

Every error raised by the package descends from VennDiagramError so callers can
catch a single exception type if they don't care about the subclass.
"""


class VennDiagramError(Exception):
    """Base class for all venn-diagram-lab errors."""


class InvalidDatasetError(VennDiagramError):
    """Raised when an input dataset cannot be parsed or is structurally invalid.

    Examples: empty file, fewer than two sets, header mismatch, unrecognised format.
    """


class UnknownModelError(VennDiagramError):
    """Raised when the requested model identifier is not in the bundled model catalog."""


class IncompatibleModelError(VennDiagramError):
    """Raised when the requested model exists but its set count does not match the dataset.

    Carries an `alternatives` attribute listing compatible models so callers can
    render an actionable message.
    """

    def __init__(self, message: str, alternatives: list[str] | None = None) -> None:
        super().__init__(message)
        self.alternatives = list(alternatives or [])
