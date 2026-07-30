// Maps raw API error codes (see apps/api's ProfileService/utils/media-validation.ts) to
// human-readable French copy. The slice keeps the raw code so this mapping only ever
// happens at the UI boundary, matching how onboarding/auth error codes are handled.
const MEDIA_ERROR_MESSAGES: Record<string, string> = {
  photo_too_large: 'Photo trop volumineuse (8 Mo maximum).',
  video_too_large: 'Vidéo trop volumineuse (50 Mo maximum).',
  unsupported_media_type: 'Ce format de fichier n’est pas pris en charge.',
  invalid_file_signature: 'Ce fichier ne correspond pas à son format déclaré.',
  photo_required: 'Sélectionnez une photo.',
  video_required: 'Sélectionnez une vidéo.',
  photo_upload_failed: 'Échec de l’envoi de la photo. Réessayez.',
  photo_delete_failed: 'Échec de la suppression de la photo. Réessayez.',
  video_upload_failed: 'Échec de l’envoi de la vidéo. Réessayez.',
  video_delete_failed: 'Échec de la suppression de la vidéo. Réessayez.',
};

export function humanizeMediaError(code: string | null | undefined): string | null {
  if (!code) return null;
  return MEDIA_ERROR_MESSAGES[code] ?? 'Une erreur est survenue. Réessayez.';
}
