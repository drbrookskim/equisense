"""GET /jobs/{job_id} Lambda 핸들러."""

from __future__ import annotations

import json
import logging
import re
import uuid
from typing import Any

from core.qualitative.repository import get_job

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

_UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.IGNORECASE
)


def _ok(body: Any) -> dict:
    return {"statusCode": 200, "headers": {"Content-Type": "application/json"}, "body": json.dumps(body, default=str)}


def _error(status: int, code: str, message: str, request_id: str) -> dict:
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps({"error": {"code": code, "message": message, "request_id": request_id}}),
    }


def lambda_handler(event: dict, context: Any) -> dict:
    """GET /jobs/{job_id} 요청을 처리합니다."""
    request_id = getattr(context, "aws_request_id", str(uuid.uuid4()))

    path_params = event.get("pathParameters") or {}
    job_id = (path_params.get("job_id") or "").strip()

    if not _UUID_RE.match(job_id):
        return _error(400, "INVALID_PARAMS", "job_id must be a valid UUID", request_id)

    logger.info("Job status request: job_id=%s", job_id)

    try:
        result = get_job(job_id)
    except Exception as e:
        logger.error("DB error for job %s: %s", job_id, e)
        return _error(503, "DB_ERROR", "Database temporarily unavailable", request_id)

    if result is None:
        return _error(404, "JOB_NOT_FOUND", f"Job {job_id} not found", request_id)

    job, qual_result = result
    return _ok(
        {
            "job_id": job.id,
            "status": job.status,
            "result": qual_result.model_dump() if qual_result else None,
            "error": job.error_message if job.status == "FAILED" else None,
        }
    )
