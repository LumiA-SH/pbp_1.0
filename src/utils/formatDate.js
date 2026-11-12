export default function formatDate(value) {
    return value
        ? new Date(value).toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' })
        : '';
}
