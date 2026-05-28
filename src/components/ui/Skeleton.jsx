const Skeleton = ({ width = '100%', height = 16, radius = 8, className = '', style }) => (
  <span
    className={`skeleton ${className}`.trim()}
    style={{ width, height, borderRadius: radius, ...style }}
    aria-hidden
  />
);

export default Skeleton;
