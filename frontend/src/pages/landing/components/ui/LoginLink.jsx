import { Link } from 'react-router-dom';

export default function LoginLink({ className, children, ...props }) {
  return (
    <Link to="/login" className={className} {...props}>
      {children}
    </Link>
  );
}
