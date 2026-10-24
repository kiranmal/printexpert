export default function AdminTable({
  headers,
  children,
}) {

  return (
    <div className="table-wrap">

      <table className="admin-table">

        <thead>

          <tr>

            {headers.map((header) => (
              <th key={header}>
                {header}
              </th>
            ))}

          </tr>

        </thead>


        <tbody>
          {children}
        </tbody>

      </table>

    </div>
  );
}