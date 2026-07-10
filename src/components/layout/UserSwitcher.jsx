import { useUser } from '../../hooks/useUser';

const UserSwitcher = () => {
  const { userId, setUserId, users } = useUser();

  return (
    <div className="user-switcher" role="group" aria-label="Budget profile">
      {users.map((u) => (
        <button
          key={u.id}
          type="button"
          className={`user-switcher-btn ${userId === u.id ? 'active' : ''}`}
          onClick={() => setUserId(u.id)}
        >
          {u.name}
        </button>
      ))}
    </div>
  );
};

export default UserSwitcher;
