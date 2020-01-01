#include <string.h>
#include <stdlib.h>

#ifdef __cplusplus
extern "C" {
#endif

char* malloc_copy(char* input)
{
    char* result = (char*)malloc(1024);
    if (result == NULL) {
        return NULL;
    }

    strncpy(result, input, strlen(input));

    return result;
}

void malloc_free(char* input)
{
    if (input == NULL) {
        return;
    }

    free(input);
}


#ifdef __cplusplus
}
#endif
