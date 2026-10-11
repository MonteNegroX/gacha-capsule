import styles from '@/components/record-table.module.css'

export type RecordColumn = {
  label: string
  value: string
}

export function RecordTable({
  caption,
  columns,
  rows,
}: {
  caption: string
  columns: string[]
  rows: Array<{ key: string; cells: RecordColumn[] }>
}) {
  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <caption className={styles.caption}>{caption}</caption>
        <thead className={styles.head}>
          <tr>
            {columns.map((column) => (
              <th key={column} scope="col" className={styles.cell}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={styles.body}>
          {rows.map((row) => (
            <tr key={row.key} className={styles.row}>
              {row.cells.map((cell, index) =>
                index === 0 ? (
                  <th key={cell.label} scope="row" className={styles.rowHead}>
                    {cell.value}
                  </th>
                ) : (
                  <td key={cell.label} className={styles.cell} data-label={cell.label}>
                    {cell.value}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
