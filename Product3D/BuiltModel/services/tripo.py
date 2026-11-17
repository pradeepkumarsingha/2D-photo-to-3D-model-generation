import requests
from django.conf import settings


class TripoError(Exception):
    """Raised when the Tripo API request fails."""
    pass


class TripoClient:
    def __init__(self):
        api_key = getattr(settings, "TRIPO_API_KEY", "")

        if not api_key:
            raise TripoError(
                "TRIPO_API_KEY is missing. Check your .env file."
            )

        self.base_url = getattr(
            settings,
            "TRIPO_BASE_URL",
            "https://openapi.tripo3d.ai/v3"
        ).rstrip("/")

        self.headers = {
            "Authorization": f"Bearer {api_key}"
        }

    def _request(self, method, endpoint, **kwargs):
        try:
            response = requests.request(
                method,
                f"{self.base_url}/{endpoint.lstrip('/')}",
                headers=self.headers,
                timeout=90,
                **kwargs
            )
            response.raise_for_status()
            result = response.json()
        except requests.Timeout as exc:
            raise TripoError(f"Tripo API timed out: {exc}") from exc
        except requests.HTTPError as exc:
            detail = self._response_error(response)
            if response.status_code == 401:
                message = "Tripo rejected the API key (401). Replace TRIPO_API_KEY."
            elif response.status_code == 403:
                message = (
                    "Tripo denied this request (403). Check that the API key is "
                    "active and enabled for image-to-model generation."
                )
            elif response.status_code == 402:
                message = "Tripo rejected the request because the account has insufficient credits."
            else:
                message = f"Tripo returned HTTP {response.status_code}."
            if detail:
                message += f" Provider message: {detail}"
            raise TripoError(message) from exc
        except requests.RequestException as exc:
            raise TripoError(f"Tripo API connection failed: {exc}")
        except ValueError as exc:
            raise TripoError("Tripo returned an invalid JSON response.") from exc

        if not isinstance(result, dict) or result.get("code") != 0:
            raise TripoError(
                result.get("message", "Unknown Tripo API error.")
                if isinstance(result, dict)
                else "Tripo returned an invalid response."
            )

        return result.get("data", {})

    @staticmethod
    def _response_error(response):
        try:
            payload = response.json()
            if isinstance(payload, dict):
                data = payload.get("data")
                return str(payload.get("message") or payload.get("error_message") or (
                    data.get("message") if isinstance(data, dict) else ""
                ))
        except ValueError:
            pass
        return response.text[:300].strip()

    def upload_image(self, image_file):
        image_file.open("rb")

        try:
            response = requests.post(
                f"{self.base_url}/files",
                headers=self.headers,
                files={
                    "file": (
                        image_file.name,
                        image_file,
                        getattr(
                            image_file,
                            "content_type",
                            "application/octet-stream"
                        )
                    )
                },
                timeout=90
            )

            response.raise_for_status()
            result = response.json()
        except requests.Timeout as exc:
            raise TripoError(f"Image upload timed out: {exc}") from exc
        except requests.HTTPError as exc:
            detail = self._response_error(response)
            if response.status_code in (401, 403):
                message = "Tripo rejected the API key during image upload."
            else:
                message = f"Tripo image upload returned HTTP {response.status_code}."
            if detail:
                message += f" Provider message: {detail}"
            raise TripoError(message) from exc
        except requests.RequestException as exc:
            raise TripoError(f"Image upload failed: {exc}")
        except ValueError as exc:
            raise TripoError("Invalid response during image upload.") from exc

        finally:
            image_file.close()

        if not isinstance(result, dict) or result.get("code") != 0:
            raise TripoError(
                result.get("message", "Tripo image upload failed.")
                if isinstance(result, dict)
                else "Tripo returned an invalid upload response."
            )

        file_token = result.get("data", {}).get("file_token")

        if not file_token:
            raise TripoError("Tripo did not return an image file token.")

        return file_token

    def create_image_task(self, file_token):
        payload = {
            "type": "image_to_model",
            "input": file_token,
            "model": getattr(
                settings,
                "TRIPO_MODEL",
                "v3.1-20260211"
            ),
            "texture": True,
            "pbr": True,
            "texture_quality": getattr(
                settings,
                "TRIPO_TEXTURE_QUALITY",
                "standard"
            ),
            "enable_image_autofix": True
        }

        data = self._request(
            "POST",
            "/generation/image-to-model",
            json=payload
        )

        task_id = data.get("task_id")

        if not task_id:
            raise TripoError("Tripo did not return a task ID.")

        return task_id

    def get_task(self, task_id):
        return self._request(
            "GET",
            f"/tasks/{task_id}"
        )

    def download_model(self, url):
        try:
            response = requests.get(
                url,
                timeout=180,
                stream=True
            )
            response.raise_for_status()
            return response.content

        except requests.Timeout as exc:
            raise TripoError(f"Model download timed out: {exc}") from exc
        except requests.RequestException as exc:
            raise TripoError(f"Model download failed: {exc}")
