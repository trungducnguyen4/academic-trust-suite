# Jira Import Guide For Project Scope

Muc tieu cua bo file nay la dua nhung hang muc da lam vao Jira de ban nhin lai scope du an theo cach nhanh va an toan voi CSV importer.

## File da tao

- `planning/jira-scope-epics.csv`: danh sach Epic muc cao de nhin tong the scope.
- `planning/jira-scope-features.csv`: danh sach Story/Task chi tiet theo cac tinh nang da co trong codebase hien tai.

## Nen import file nao truoc

Neu ban muon nhin tong scope nhanh:

1. Import `planning/jira-scope-epics.csv` truoc.

Neu ban muon nhin scope chi tiet hon:

1. Import `planning/jira-scope-epics.csv`.
2. Import tiep `planning/jira-scope-features.csv`.

## Cach import trong Jira

1. Vao Jira va tao hoac mo project ban muon dung de review scope.
2. Chon import bang CSV.
3. Upload mot trong hai file CSV o tren.
4. O buoc field mapping, uu tien map nhu sau:
   - `Summary` -> Summary
   - `Issue Type` -> Issue Type
   - `Description` -> Description
   - `Labels` -> Labels
   - `Priority` -> Priority
   - `Components` -> Component/s neu project cua ban co field nay
5. Chay import va kiem tra lai issue type sau khi import.

## Luu y ve new import experience

- New import experience phu hop nhat khi ban import vao project moi bang CSV.
- Neu ban can import vao project da ton tai va gap han che field mapping, Jira hien tai van khuyen dung old import experience.
- Neu project cua ban khong co `Components`, bo qua cot nay khi mapping.

## Cach doc scope sau khi import

- Loc theo `Issue Type = Epic` de xem tong the scope.
- Loc theo `label = implemented` de xem nhung gi da duoc code.
- Loc theo label nhu `auth`, `courses`, `integrity`, `ai` de review theo workstream.

## Ghi chu

Bo scope nay duoc tong hop tu cau truc frontend/backend hien co, API documentation va cac module trong codebase. Neu ban muon, buoc tiep theo toi co the tao them mot file CSV theo format:

- backlog theo tung sprint
- timeline theo module da hoan thanh
- task phan tach theo frontend/backend/database