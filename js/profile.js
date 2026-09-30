const SUPABASE_URL = 'https://nmwktpnsbwhgxkqmcaud.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_0v9XHkOALMZlg-cQHE6mCA_d_1j6xbE';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

function profileMessage(message, type = '') {
  const element = document.getElementById('profile-message');
  if (!element) return;
  element.textContent = message;
  element.className = `form-message ${type}`;
}

function initials(name = '') {
  const clean = name.trim();
  if (!clean) return '👤';
  return clean.split(/\s+/).slice(0, 2).map(part => part[0].toUpperCase()).join('');
}

function updateAvatar(url, name) {
  const image = document.getElementById('profile-avatar-preview');
  const placeholder = document.getElementById('profile-avatar-placeholder');
  if (!image || !placeholder) return;

  if (url) {
    image.src = url;
    image.hidden = false;
    placeholder.hidden = true;
  } else {
    image.hidden = true;
    placeholder.hidden = false;
    placeholder.textContent = initials(name);
  }
}

function setHeaderUser(profile) {
  const link = document.getElementById('header-user');
  if (!link) return;
  link.href = 'perfil.html';
  link.title = 'Meu perfil';
  if (profile?.avatar_url) {
    link.innerHTML = `<img src="${profile.avatar_url}" alt="Meu perfil">`;
  } else {
    link.textContent = '👤';
  }
}

async function personalizeHeader() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  const { data } = await supabase
    .from('profiles')
    .select('username,full_name,avatar_url')
    .eq('id', session.user.id)
    .maybeSingle();

  setHeaderUser(data || {});
}

async function loadProfile() {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    window.location.href = 'login.html';
    return null;
  }

  const user = session.user;
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id,email,username,full_name,avatar_url,bio')
    .eq('id', user.id)
    .maybeSingle();

  if (error) throw error;

  const current = profile || {
    id: user.id,
    email: user.email || '',
    username: '',
    full_name: '',
    avatar_url: '',
    bio: ''
  };

  document.getElementById('profile-email').value = user.email || current.email || '';
  document.getElementById('profile-username').value = current.username || '';
  document.getElementById('profile-full-name').value = current.full_name || '';
  document.getElementById('profile-bio').value = current.bio || '';
  document.getElementById('profile-display-email').textContent = user.email || '';
  document.getElementById('profile-display-name').textContent =
    current.full_name || current.username || 'Seu perfil';

  updateAvatar(current.avatar_url, current.full_name || current.username);
  setHeaderUser(current);

  return { user, profile: current };
}

async function uploadAvatar(user, file) {
  if (!file) return null;

  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    throw new Error('Escolha uma imagem PNG, JPG ou WebP.');
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error('A foto deve ter no máximo 5 MB.');
  }

  const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const basePath = `${user.id}/avatar`;

  await supabase.storage.from('avatars').remove([
    `${basePath}.png`,
    `${basePath}.jpg`,
    `${basePath}.webp`
  ]);

  const path = `${basePath}.${extension}`;
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: true
    });

  if (error) throw error;

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}

document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('profile-form');
  const avatarInput = document.getElementById('avatar-input');
  const logoutButton = document.getElementById('logout-button');

  // Em outras páginas, o script apenas personaliza o ícone do usuário.
  // A edição/carregamento completo só acontece em perfil.html.
  if (!form) {
    personalizeHeader().catch(error => console.error('Cabeçalho do perfil:', error));
    return;
  }

  try {
    const loaded = await loadProfile();
    if (!loaded) return;

    avatarInput?.addEventListener('change', async () => {
      const file = avatarInput.files?.[0];
      if (!file) return;

      try {
        profileMessage('Enviando foto...');
        const avatarUrl = await uploadAvatar(loaded.user, file);

        const { error } = await supabase
          .from('profiles')
          .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
          .eq('id', loaded.user.id);

        if (error) throw error;

        updateAvatar(avatarUrl, loaded.profile.full_name || loaded.profile.username);
        setHeaderUser({ ...loaded.profile, avatar_url: avatarUrl });
        profileMessage('Foto atualizada com sucesso.', 'success');
      } catch (error) {
        console.error('Avatar:', error);
        profileMessage(error.message || 'Não foi possível atualizar a foto.', 'error');
      } finally {
        avatarInput.value = '';
      }
    });

    form?.addEventListener('submit', async (event) => {
      event.preventDefault();

      const username = document.getElementById('profile-username').value.trim();
      const fullName = document.getElementById('profile-full-name').value.trim();
      const bio = document.getElementById('profile-bio').value.trim();

      if (username && !/^[a-zA-Z0-9_.-]{3,30}$/.test(username)) {
        profileMessage('O nome de usuário deve ter de 3 a 30 caracteres e usar apenas letras, números, ponto, hífen ou sublinhado.', 'error');
        return;
      }

      profileMessage('Salvando alterações...');

      const { error } = await supabase
        .from('profiles')
        .update({
          username: username || null,
          full_name: fullName || null,
          bio: bio || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', loaded.user.id);

      if (error) {
        console.error('Perfil:', error);
        if (error.code === '23505') {
          profileMessage('Esse nome de usuário já está em uso. Escolha outro.', 'error');
        } else {
          profileMessage(error.message || 'Não foi possível salvar o perfil.', 'error');
        }
        return;
      }

      loaded.profile = {
        ...loaded.profile,
        username,
        full_name: fullName,
        bio
      };

      document.getElementById('profile-display-name').textContent = fullName || username || 'Seu perfil';
      updateAvatar(loaded.profile.avatar_url, fullName || username);
      profileMessage('Perfil salvo com sucesso!', 'success');
    });

    logoutButton?.addEventListener('click', async () => {
      logoutButton.disabled = true;
      logoutButton.textContent = 'Saindo...';
      await supabase.auth.signOut();
      window.location.href = 'index.html';
    });
  } catch (error) {
    console.error('Carregamento do perfil:', error);
    profileMessage('Não foi possível carregar seu perfil. Atualize a página e tente novamente.', 'error');
  }
});
