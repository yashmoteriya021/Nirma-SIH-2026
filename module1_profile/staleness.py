"""
Module 1: Staleness Checker

Checks whether identity/income documents are still within their validity window.
Based on researched Indian certificate validity rules:
  - Income Certificate: valid for 1 financial year from issue date
  - SC Certificate: lifetime validity (no expiry)
  - OBC-NCL Certificate: valid for 1 financial year (tied to income/creamy-layer check)

Sources:
  - bankbazaar.com, herofincorp.com, careers360.com (income cert validity)
  - godigit.com, jaagrukbharat.com (SC cert lifetime validity)
  - bharatnotes.com, careers360.com (OBC-NCL annual renewal)
"""

from datetime import date, datetime
from typing import NamedTuple


class StalenessResult(NamedTuple):
    """Result of a staleness check."""
    needs_reverification: bool
    reason: str


# Indian financial year runs April 1 – March 31.
# An income certificate is valid for the financial year in which it was issued.
# E.g., cert issued 2025-06-15 is valid until 2026-03-31.

def _get_financial_year_end(issue_date: date) -> date:
    """
    Given a certificate issue date, return the end of that financial year.
    FY runs April 1 to March 31.
    If issued Jan–Mar, the FY ends that same March 31.
    If issued Apr–Dec, the FY ends next March 31.
    """
    if issue_date.month <= 3:
        # Jan-Mar: FY ends this March 31
        return date(issue_date.year, 3, 31)
    else:
        # Apr-Dec: FY ends next March 31
        return date(issue_date.year + 1, 3, 31)


def check_income_certificate_staleness(
    issue_date: date | str,
    check_date: date | None = None,
) -> StalenessResult:
    """
    Check if an income certificate is stale.

    Validity rule: An income certificate is valid for the financial year
    in which it was issued (April 1 – March 31). After March 31 of that FY,
    it needs renewal.

    Args:
        issue_date: Date the income certificate was issued.
        check_date: Date to check against (defaults to today).

    Returns:
        StalenessResult with needs_reverification flag and reason.
    """
    if isinstance(issue_date, str):
        issue_date = date.fromisoformat(issue_date)
    if check_date is None:
        check_date = date.today()

    fy_end = _get_financial_year_end(issue_date)

    if check_date > fy_end:
        return StalenessResult(
            needs_reverification=True,
            reason=(
                f"Income certificate issued on {issue_date.isoformat()} expired at end of "
                f"FY {fy_end.isoformat()}. Current date {check_date.isoformat()} is past "
                f"the validity window. Please obtain a renewed income certificate."
            ),
        )
    else:
        return StalenessResult(
            needs_reverification=False,
            reason=(
                f"Income certificate issued on {issue_date.isoformat()} is valid until "
                f"{fy_end.isoformat()}."
            ),
        )


def check_caste_certificate_staleness(
    category: str,
    issue_date: date | str | None = None,
    check_date: date | None = None,
) -> StalenessResult:
    """
    Check if a caste certificate needs renewal.

    Rules:
      - SC/ST certificates: lifetime validity, no renewal needed.
      - OBC-NCL certificates: valid for 1 financial year (same logic as income cert,
        because OBC-NCL status is tied to annual income verification for creamy layer).
      - SafaiKaramchari/ManualScavenger/WastePicker: treated as lifetime once verified
        (similar to SC, these are identity-based, not income-based).

    Args:
        category: The social category (SC, OBC, SafaiKaramchari, etc.)
        issue_date: Date the caste certificate was issued (needed for OBC-NCL).
        check_date: Date to check against (defaults to today).

    Returns:
        StalenessResult with needs_reverification flag and reason.
    """
    lifetime_categories = {"SC", "SafaiKaramchari", "ManualScavenger", "WastePicker"}

    if category in lifetime_categories:
        return StalenessResult(
            needs_reverification=False,
            reason=f"{category} certificate has lifetime validity and does not expire.",
        )

    if category == "OBC":
        if issue_date is None:
            return StalenessResult(
                needs_reverification=True,
                reason=(
                    "OBC-NCL certificate issue date is missing. Cannot verify validity. "
                    "OBC-NCL certificates require annual renewal due to creamy-layer "
                    "income verification."
                ),
            )
        if isinstance(issue_date, str):
            issue_date = date.fromisoformat(issue_date)
        if check_date is None:
            check_date = date.today()

        fy_end = _get_financial_year_end(issue_date)
        if check_date > fy_end:
            return StalenessResult(
                needs_reverification=True,
                reason=(
                    f"OBC-NCL certificate issued on {issue_date.isoformat()} expired at "
                    f"end of FY {fy_end.isoformat()}. OBC-NCL certificates need annual "
                    f"renewal to verify Non-Creamy Layer status."
                ),
            )
        else:
            return StalenessResult(
                needs_reverification=False,
                reason=(
                    f"OBC-NCL certificate issued on {issue_date.isoformat()} is valid "
                    f"until {fy_end.isoformat()}."
                ),
            )

    # Unknown category — flag for safety
    return StalenessResult(
        needs_reverification=True,
        reason=f"Unknown category '{category}'. Cannot determine certificate validity.",
    )


def check_all_staleness(
    category: str,
    income_cert_issue_date: date | str,
    caste_cert_issue_date: date | str | None = None,
    check_date: date | None = None,
) -> dict:
    """
    Run all staleness checks for a profile and return a combined result.

    Returns:
        dict with keys:
          - needs_reverification (bool): True if ANY document is stale.
          - income_check (StalenessResult)
          - caste_check (StalenessResult)
          - reverification_reasons (list[str]): All reasons requiring action.
    """
    income_check = check_income_certificate_staleness(
        income_cert_issue_date, check_date
    )
    caste_check = check_caste_certificate_staleness(
        category, caste_cert_issue_date, check_date
    )

    reasons = []
    if income_check.needs_reverification:
        reasons.append(income_check.reason)
    if caste_check.needs_reverification:
        reasons.append(caste_check.reason)

    return {
        "needs_reverification": income_check.needs_reverification or caste_check.needs_reverification,
        "income_check": income_check,
        "caste_check": caste_check,
        "reverification_reasons": reasons,
    }
